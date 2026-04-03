import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockRefetch = jest.fn(async () => ({}));
const mockSetQueryData = jest.fn();
const mockInvalidateQueries = jest.fn(async () => ({}));
const mockUseQuery = jest.fn();
const mockRefetchLandlordQueries = jest.fn(async () => ({}));

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: {
      isDark: false,
      colors: {
        primary: '#059669',
      },
    },
  }),
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

jest.mock('@tanstack/react-query', () => ({
  __esModule: true,
  useQuery: (...args) => mockUseQuery(...args),
  useQueryClient: () => ({
    setQueryData: mockSetQueryData,
    invalidateQueries: mockInvalidateQueries,
  }),
}));

jest.mock('../features/landlord/hooks/useLandlordQueryHelpers.js', () => ({
  __esModule: true,
  landlordQueryKeys: {
    notifications: () => ['landlordNotifications'],
    unreadNotificationCount: () => ['landlordUnreadNotificationCount'],
    dashboardBundle: () => ['landlordDashboardBundle'],
  },
  refetchLandlordQueries: (...args) => mockRefetchLandlordQueries(...args),
  useLandlordFocusRefetch: jest.fn(),
  useLandlordRefreshHandler: jest.fn(() => jest.fn()),
}));

jest.mock('../services/api.js', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
    get: jest.fn(),
  },
}));

const NotificationsScreen = require('../features/landlord/screens/Notifications/Notifications.jsx').default;
const api = require('../services/api.js').default;

describe('Landlord notification read flow smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          type: 'booking',
          title: 'New booking',
          message: 'A new booking arrived',
          timestamp: '2026-04-03T10:00:00Z',
          read: false,
        },
      ],
      isPending: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('markAsRead syncs unread and dashboard derived queries', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });

    render(<NotificationsScreen navigation={{ goBack: jest.fn() }} />);

    fireEvent.press(screen.getByText('New booking'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/1/read');
    });

    expect(mockRefetchLandlordQueries).toHaveBeenCalledWith([mockRefetch]);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['landlordUnreadNotificationCount'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['landlordDashboardBundle'],
    });
  });

  it('markAllAsRead syncs unread and dashboard derived queries', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });

    render(<NotificationsScreen navigation={{ goBack: jest.fn() }} />);

    fireEvent.press(screen.getByText('Mark all read'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all?role=landlord');
    });

    expect(mockRefetchLandlordQueries).toHaveBeenCalledWith([mockRefetch]);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['landlordUnreadNotificationCount'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['landlordDashboardBundle'],
    });
  });
});
