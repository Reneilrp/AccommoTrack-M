import React from 'react';
import { Alert, Switch } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AddProperty from '../features/landlord/screens/Properties/AddProperty.jsx';
import DormProfileSettings from '../features/landlord/screens/Properties/DormProfileSettings.jsx';
import Caretakers from '../features/landlord/screens/Settings/Account/Caretakers.jsx';
import VerificationStatus from '../features/landlord/screens/Settings/Account/VerificationStatus.jsx';
import ManualPaymentSettings from '../features/landlord/screens/Settings/ManualPaymentSettings.jsx';
import ProfileService from '../services/ProfileService.js';
import PropertyService from '../services/PropertyService.js';
import CaretakerService from '../services/CaretakerService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccess } from '../utils/toast.js';

const mockTheme = {
  isDark: false,
  colors: {
    primary: '#16a34a',
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
    getCurrentUser: jest.fn(),
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
    getProperty: jest.fn(),
    updateProperty: jest.fn(),
  },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
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

const getFormDataEntries = (formData) => {
  if (!formData) return [];
  if (Array.isArray(formData._parts)) return formData._parts;

  const entries = [];
  if (typeof formData.forEach === 'function') {
    formData.forEach((value, key) => {
      entries.push([key, value]);
    });
  }

  return entries;
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

    await screen.findByText('PayMongo Not Verified');
    expect(
      screen.getByText(
        /complete PayMongo verification before enabling online payments/i,
      ),
    ).toBeTruthy();
  }, 15000);

  it('AddProperty shows gender restriction picker for non-apartment types', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'approved', user: { is_verified: true } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'verified' }),
    );

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Save Draft');

    const propertyTypePicker = screen.getByTestId('add-property-type-picker');
    fireEvent(propertyTypePicker, 'valueChange', 'dormitory');

    const genderPicker = await screen.findByTestId('add-property-gender-picker');
    expect(genderPicker).toBeTruthy();

    fireEvent(genderPicker, 'valueChange', 'female');
    expect(screen.getByTestId('add-property-gender-picker')).toBeTruthy();

    fireEvent(propertyTypePicker, 'valueChange', 'apartment');
    await waitFor(() => {
      expect(screen.queryByTestId('add-property-gender-picker')).toBeNull();
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

  it('AddProperty allows final submission for partial verified accounts', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'partial_verified', user: { is_verified: false } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'pending' }),
    );
    PropertyService.createProperty.mockResolvedValue({
      success: true,
      data: { id: 654 },
    });

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Save Draft');
    expect(screen.queryByText('Account Verification Required')).toBeNull();

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Sunrise Residences'),
      'Partial Verified Residences',
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
      '456 Partial Verify Ave',
    );
    fireEvent.changeText(screen.getByPlaceholderText('City'), 'Zamboanga City');

    fireEvent.press(screen.getByText('Next Step'));
    fireEvent.press(screen.getByText('Next Step'));

    await screen.findByText('Submit Property');
    fireEvent.press(screen.getByText('Submit Property'));

    await waitFor(() => {
      expect(PropertyService.createProperty).toHaveBeenCalledTimes(1);
    });

    const payload = PropertyService.createProperty.mock.calls[0][0];
    const entries = getFormDataEntries(payload);
    const valueByKey = new Map(entries);

    expect(valueByKey.get('current_status')).toBe('pending');
  }, 15000);

  it('VerificationStatus shows reminder and upload action for partial verified landlord', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: {
        id: 55,
        status: 'partial_verified',
        document_due_at: '2026-04-19T00:00:00.000000Z',
        valid_id_type: 'Philippine Passport',
        valid_id_path: null,
        valid_id_back_path: null,
        permit_path: null,
        history: [],
      },
    });
    ProfileService.getValidIdTypes.mockResolvedValue({
      success: true,
      data: ['Philippine Passport', 'Driver\'s License'],
    });
    ProfileService.getProfile.mockResolvedValue({
      success: true,
      data: { role: 'landlord' },
    });
    ProfileService.getCurrentUser.mockResolvedValue({
      success: true,
      data: { role: 'landlord' },
    });
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ role: 'landlord' }));

    renderWithQueryClient(<VerificationStatus navigation={mockPropNavigation} />);

    await screen.findByText('Partial Verified');
    expect(screen.getByText('Submit Required Documents')).toBeTruthy();
    expect(screen.getByText(/Document reminder due:/)).toBeTruthy();
  });

  it('AddProperty save draft submits without forcing optional occupancy fields', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'approved', user: { is_verified: true } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'verified' }),
    );
    PropertyService.createProperty.mockResolvedValue({
      success: true,
      data: { id: 321 },
    });

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Save Draft');

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Sunrise Residences'),
      'Sunrise Residences',
    );

    fireEvent.press(screen.getByText('Save Draft'));

    await waitFor(() => {
      expect(PropertyService.createProperty).toHaveBeenCalledTimes(1);
    });

    const payload = PropertyService.createProperty.mock.calls[0][0];
    const entries = getFormDataEntries(payload);
    const keys = entries.map(([key]) => key);
    const valueByKey = new Map(entries);

    expect(keys).not.toContain('total_rooms');
    expect(keys).not.toContain('max_occupants');
    expect(valueByKey.get('total_floors')).toBe('1');
    expect(valueByKey.get('accepted_payments[0]')).toBe('cash');
  });

  it('AddProperty step 1 shows financial toggles', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'approved', user: { is_verified: true } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'verified', is_paymongo_ready: true }),
    );

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Require 1-Month Advance Payment');
    expect(screen.getByText('Require Instant Reservation Fee')).toBeTruthy();
    expect(screen.getByText('Allow Partial Payments')).toBeTruthy();
  });

  it('AddProperty reservation fee control is gated when PayMongo is not verified', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'pending', user: { is_verified: false } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'pending', is_paymongo_ready: false }),
    );

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Require Instant Reservation Fee');
    expect(
      screen.getByText('Complete PayMongo verification in Settings > Payments to enable this.'),
    ).toBeTruthy();

    const switches = screen.UNSAFE_getAllByType(Switch);
    const disabledSwitch = switches.find((node) => node?.props?.disabled === true);
    expect(disabledSwitch).toBeTruthy();
  });

  it('AddProperty shows reservation fee amount field only when reservation fee is enabled', async () => {
    ProfileService.getVerificationStatus.mockResolvedValue({
      success: true,
      data: { status: 'approved', user: { is_verified: true } },
    });
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'verified', is_paymongo_ready: true }),
    );

    renderWithQueryClient(<AddProperty navigation={mockPropNavigation} />);

    await screen.findByText('Require Instant Reservation Fee');
    await waitFor(() => {
      expect(
        screen.queryByText(
          'Complete PayMongo verification in Settings > Payments to enable this.',
        ),
      ).toBeNull();
    });
    expect(screen.queryByText('Reservation Fee Amount (PHP)')).toBeNull();

    const candidateSwitches = screen
      .UNSAFE_getAllByType(Switch)
      .filter((node) => node?.props?.disabled !== true);

    let reservationSwitch = null;
    for (const candidateSwitch of candidateSwitches) {
      fireEvent(candidateSwitch, 'valueChange', true);
      if (screen.queryByText('Reservation Fee Amount (PHP)')) {
        reservationSwitch = candidateSwitch;
        break;
      }
      fireEvent(candidateSwitch, 'valueChange', false);
    }

    expect(reservationSwitch).toBeTruthy();

    fireEvent(reservationSwitch, 'valueChange', false);
    await waitFor(() => {
      expect(screen.queryByText('Reservation Fee Amount (PHP)')).toBeNull();
    });
  });

  it('Caretaker create flow submits payload with unchecked permissions', async () => {
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
        {
          first_name: 'John',
          middle_name: '',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '',
          date_of_birth: '',
          password: 'StrongPass1!',
          password_confirmation: 'StrongPass1!',
          property_ids: [1],
          permissions: {
            can_view_bookings: false,
            can_view_messages: false,
            can_view_tenants: false,
            can_view_rooms: false,
            can_view_properties: false,
            can_manage_maintenance: false,
            can_manage_payments: false,
            can_view_analytics: false,
          },
        },
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Add New Caretaker')).toBeNull();
    });

    expect(showSuccess).toHaveBeenCalled();
  });

  it('Caretaker create flow submits payload with checked permissions', async () => {
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

    const permissionSwitches = screen.UNSAFE_getAllByType(Switch);

    fireEvent(permissionSwitches[0], 'valueChange', true); // bookings
    fireEvent(permissionSwitches[1], 'valueChange', true); // messages
    fireEvent(permissionSwitches[2], 'valueChange', true); // tenants

    fireEvent(permissionSwitches[3], 'valueChange', true); // rooms
    await screen.findByText('Landlord-Level Access');
    fireEvent.press(screen.getByText('Grant Access'));

    fireEvent(permissionSwitches[4], 'valueChange', true); // properties
    await screen.findByText('Landlord-Level Access');
    fireEvent.press(screen.getByText('Grant Access'));

    fireEvent(permissionSwitches[5], 'valueChange', true); // maintenance
    await screen.findByText('Landlord-Level Access');
    fireEvent.press(screen.getByText('Grant Access'));

    fireEvent(permissionSwitches[6], 'valueChange', true); // payments
    await screen.findByText('Landlord-Level Access');
    fireEvent.press(screen.getByText('Grant Access'));

    fireEvent(permissionSwitches[7], 'valueChange', true); // analytics
    await screen.findByText('Landlord-Level Access');
    fireEvent.press(screen.getByText('Grant Access'));

    fireEvent.press(screen.getByText('Dorm One'));
    fireEvent.press(screen.getByText('Confirm & Add Caretaker'));

    await waitFor(() => {
      expect(CaretakerService.createCaretaker).toHaveBeenCalledWith(
        {
          first_name: 'John',
          middle_name: '',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '',
          date_of_birth: '',
          password: 'StrongPass1!',
          password_confirmation: 'StrongPass1!',
          property_ids: [1],
          permissions: {
            can_view_bookings: true,
            can_view_messages: true,
            can_view_tenants: true,
            can_view_rooms: true,
            can_view_properties: true,
            can_manage_maintenance: true,
            can_manage_payments: true,
            can_view_analytics: true,
          },
        },
      );
    });

    expect(showSuccess).toHaveBeenCalled();
  });

  it('Caretaker create flow allows submission when no properties are available', async () => {
    CaretakerService.getCaretakers.mockResolvedValue({
      success: true,
      data: {
        caretakers: [],
        landlord_properties: [],
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

    fireEvent.press(screen.getByText('Confirm & Add Caretaker'));

    await waitFor(() => {
      expect(CaretakerService.createCaretaker).toHaveBeenCalledWith(
        expect.objectContaining({
          property_ids: [],
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

  it('DormProfileSettings save sends payment-related fields and saves successfully', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'verified', is_paymongo_ready: true }),
    );

    PropertyService.getProperty.mockResolvedValue({
      success: true,
      data: {
        id: 77,
        title: 'Dorm One',
        description: 'Updated description',
        property_type: 'dormitory',
        gender_restriction: 'mixed',
        current_status: 'active',
        street_address: '123 Main St',
        barangay: 'Barangay 1',
        city: 'Zamboanga City',
        province: 'Zamboanga Del Sur',
        postal_code: '7000',
        amenities_list: ['WiFi'],
        property_rules: JSON.stringify(['No smoking']),
        total_rooms: 12,
        max_occupants: 24,
        total_floors: 2,
        floor_level: '1,2',
        require_1month_advance: true,
        allow_partial_payments: true,
        require_reservation_fee: true,
        reservation_fee_amount: 500,
        reservation_fee_gap_days: 5,
        gcash_name: 'Juan Dela Cruz',
        gcash_number: '09171234567',
        transfer_fee: 321,
      },
    });
    PropertyService.updateProperty.mockResolvedValue({ success: true, data: {} });

    renderWithQueryClient(
      <DormProfileSettings
        route={{ params: { propertyId: 77 } }}
        navigation={mockPropNavigation}
      />,
    );

      await screen.findByDisplayValue('Dorm One');
      expect(screen.getByText('GCash Account Name')).toBeTruthy();
      expect(screen.getByText('GCash Number')).toBeTruthy();
      expect(screen.getByText('Room Transfer Processing Fee (₱)')).toBeTruthy();

      fireEvent.changeText(screen.getByDisplayValue('321'), '654');

    fireEvent.press(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(PropertyService.updateProperty).toHaveBeenCalledTimes(1);
    });

    const [propertyIdArg, payload] = PropertyService.updateProperty.mock.calls[0];
    const entries = getFormDataEntries(payload);
    const valueByKey = new Map(entries);

    expect(propertyIdArg).toBe(77);
    expect(valueByKey.get('allow_partial_payments')).toBe('1');
    expect(valueByKey.get('require_reservation_fee')).toBe('1');
    expect(valueByKey.get('reservation_fee_amount')).toBe('500');
    expect(valueByKey.get('reservation_fee_gap_days')).toBe('5');
    expect(valueByKey.get('gcash_name')).toBe('Juan Dela Cruz');
    expect(valueByKey.get('gcash_number')).toBe('09171234567');
    expect(valueByKey.get('transfer_fee')).toBe('654');

    await waitFor(() => {
      expect(mockPropNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('DormProfileSettings persists updated financial fields on next load after save', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ paymongo_verification_status: 'verified', is_paymongo_ready: true }),
    );

    const initialProperty = {
      id: 78,
      title: 'Dorm Two',
      description: 'Initial description',
      property_type: 'dormitory',
      gender_restriction: 'mixed',
      current_status: 'active',
      street_address: '456 Main St',
      barangay: 'Barangay 2',
      city: 'Zamboanga City',
      province: 'Zamboanga Del Sur',
      postal_code: '7000',
      amenities_list: ['WiFi'],
      property_rules: JSON.stringify(['No smoking']),
      total_rooms: 10,
      max_occupants: 20,
      total_floors: 2,
      floor_level: '1,2',
      require_1month_advance: true,
      allow_partial_payments: true,
      require_reservation_fee: true,
      reservation_fee_amount: 500,
      reservation_fee_gap_days: 5,
      gcash_name: 'Maria Santos',
      gcash_number: '09181234567',
      transfer_fee: 300,
    };

    const persistedProperty = {
      ...initialProperty,
      reservation_fee_gap_days: 7,
      transfer_fee: 650,
    };

    PropertyService.getProperty
      .mockResolvedValueOnce({ success: true, data: initialProperty })
      .mockResolvedValueOnce({ success: true, data: persistedProperty });
    PropertyService.updateProperty.mockResolvedValue({ success: true, data: {} });

    renderWithQueryClient(
      <DormProfileSettings
        route={{ params: { propertyId: 78 } }}
        navigation={mockPropNavigation}
      />,
    );

    await screen.findByDisplayValue('Dorm Two');

    fireEvent.changeText(screen.getByDisplayValue('300'), '650');
    fireEvent.changeText(screen.getByDisplayValue('5'), '7');

    fireEvent.press(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(PropertyService.updateProperty).toHaveBeenCalledTimes(1);
      expect(mockPropNavigation.goBack).toHaveBeenCalled();
    });

    screen.unmount();

    renderWithQueryClient(
      <DormProfileSettings
        route={{ params: { propertyId: 78 } }}
        navigation={mockPropNavigation}
      />,
    );

    await waitFor(() => {
      expect(PropertyService.getProperty).toHaveBeenCalledTimes(2);
      expect(screen.getByDisplayValue('650')).toBeTruthy();
      expect(screen.getByDisplayValue('7')).toBeTruthy();
    });
  });
});
