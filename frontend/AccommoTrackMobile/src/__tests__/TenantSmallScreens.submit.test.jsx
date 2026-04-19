import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LeaveReview from '../features/tenant/screens/Reviews/LeaveReview.jsx';
import ReportProperty from '../features/tenant/screens/Support/ReportProperty.jsx';
import CreateRequest from '../features/tenant/screens/Maintenance/CreateRequest.jsx';

const mockGoBack = jest.fn();
let mockRouteParams = {};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams }),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
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
        background: '#f8fafc',
        backgroundSecondary: '#e2e8f0',
        surface: '#ffffff',
        border: '#e2e8f0',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

jest.mock('../features/tenant/components/Header.jsx', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockHeader({ title = 'Header' }) {
    return <Text>{title}</Text>;
  };
});

jest.mock('../utils/toast.js', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}));

jest.mock('../services/TenantService.js', () => ({
  __esModule: true,
  default: {
    submitReview: jest.fn(),
    updateReview: jest.fn(),
    submitReport: jest.fn(),
    submitMaintenanceRequest: jest.fn(),
  },
}));

const TenantService = jest.requireMock('../services/TenantService.js').default;
const toastUtils = jest.requireMock('../utils/toast.js');

const getFormDataValue = (formData, key) => {
  if (!formData) return undefined;

  if (typeof formData.get === 'function') {
    return formData.get(key);
  }

  if (Array.isArray(formData._parts)) {
    const pair = formData._parts.find(([entryKey]) => entryKey === key);
    return pair ? pair[1] : undefined;
  }

  return undefined;
};

describe('Tenant small-screen submit flows (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockGoBack.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    TenantService.submitReview.mockResolvedValue({ success: true });
    TenantService.updateReview.mockResolvedValue({ success: true });
    TenantService.submitReport.mockResolvedValue({ success: true });
    TenantService.submitMaintenanceRequest.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('submits new review and navigates back', async () => {
    mockRouteParams = { bookingId: 44, propertyId: 55 };

    render(<LeaveReview />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Write your review...'),
      'Great location and clean room.',
    );

    fireEvent.press(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(TenantService.submitReview).toHaveBeenCalledWith({
        property_id: 55,
        booking_id: 44,
        rating: 5,
        comment: 'Great location and clean room.',
      });
    });

    expect(TenantService.updateReview).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('updates existing review when reviewId is provided', async () => {
    mockRouteParams = {
      reviewId: 777,
      bookingId: 44,
      propertyId: 55,
      initialRating: 4,
      initialComment: 'Good stay',
    };

    render(<LeaveReview />);

    fireEvent.press(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(TenantService.updateReview).toHaveBeenCalledWith(777, {
        property_id: 55,
        booking_id: 44,
        rating: 4,
        comment: 'Good stay',
      });
    });

    expect(TenantService.submitReview).not.toHaveBeenCalled();
  });

  it('submits report property payload with selected reason and description', async () => {
    mockRouteParams = {
      propertyId: 91,
      propertyTitle: 'Dorm South',
    };

    render(<ReportProperty />);

    fireEvent.press(screen.getByText('Safety or Security Concerns'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Please provide specific details about the issue...'),
      'Main entrance lock appears broken and unsecured at night.',
    );

    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => {
      expect(TenantService.submitReport).toHaveBeenCalledWith({
        property_id: 91,
        reason: 'Safety or Security Concerns',
        description: 'Main entrance lock appears broken and unsecured at night.',
      });
    });
  });

  it('submits maintenance request with backend-valid default priority', async () => {
    mockRouteParams = {
      bookingId: 123,
      propertyId: 456,
      roomId: 789,
    };

    render(<CreateRequest />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Brief summary of the issue'),
      'Leaking faucet',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('Provide more details about the problem...'),
      'Bathroom sink faucet leaks continuously when fully closed.',
    );

    fireEvent.press(screen.getByText('Submit Request'));

    await waitFor(() => {
      expect(TenantService.submitMaintenanceRequest).toHaveBeenCalled();
    });

    const [payload, isMultipart] = TenantService.submitMaintenanceRequest.mock.calls[0];
    expect(isMultipart).toBe(true);
    expect(String(getFormDataValue(payload, 'booking_id'))).toBe('123');
    expect(String(getFormDataValue(payload, 'property_id'))).toBe('456');
    expect(String(getFormDataValue(payload, 'room_id'))).toBe('789');
    expect(getFormDataValue(payload, 'priority')).toBe('medium');
    expect(toastUtils.showSuccess).toHaveBeenCalled();
  });
});
