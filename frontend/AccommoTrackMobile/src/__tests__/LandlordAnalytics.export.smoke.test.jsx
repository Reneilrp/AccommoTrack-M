import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Analytics from '../features/landlord/screens/Analytics/Analytics.jsx';
import analyticsService from '../services/AnalyticsService.js';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

jest.setTimeout(20000);

jest.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: {
      isDark: false,
      colors: {
        primary: '#16a34a',
        primaryDark: '#047857',
        primaryLight: '#d1fae5',
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
        error: '#ef4444',
        errorLight: '#fee2e2',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{name}</ReactNative.Text>;
  },
}));

jest.mock('react-native-chart-kit', () => ({
  BarChart: () => null,
  LineChart: () => null,
  PieChart: () => null,
}));

jest.mock('../features/landlord/hooks/useLandlordQueryHelpers.js', () => ({
  landlordQueryKeys: {
    analyticsProperties: () => ['landlordAnalyticsProperties'],
    analyticsDashboard: ({ propertyId = 'all', timeRange = 'month' } = {}) => [
      'landlordAnalyticsDashboard',
      propertyId,
      timeRange,
    ],
  },
  useLandlordFocusRefetch: jest.fn(),
  useLandlordRefreshHandler: ({ refetchers = [] } = {}) => async () => {
    await Promise.all(refetchers.map((refetch) => (typeof refetch === 'function' ? refetch() : null)));
  },
}));

jest.mock('../services/AnalyticsService.js', () => ({
  __esModule: true,
  default: {
    getProperties: jest.fn(),
    getDashboardAnalytics: jest.fn(),
    exportAnalyticsCsv: jest.fn(),
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const navigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const analyticsFixture = {
  overview: {
    total_revenue: 12000,
    monthly_revenue: 3000,
    revenue_growth_rate: 12.5,
    active_tenants: 8,
    new_tenants_this_month: 2,
    occupancy_rate: 75,
  },
  revenue: {
    actual_monthly: 2800,
    collection_rate: 93.3,
    monthly_trend: [
      { month: 'Week 1', revenue: 1000 },
      { month: 'Week 2', revenue: 1200 },
      { month: 'Week 3', revenue: 800 },
    ],
    income_breakdown: [
      { name: 'Rent', value: 2600 },
      { name: 'Add-ons', value: 200 },
    ],
  },
  tenants: {
    average_stay_months: 9.4,
  },
  payments: {
    paid: 7,
    unpaid: 1,
    partial: 0,
    overdue: 0,
  },
  properties: [
    {
      id: 1,
      name: 'Dorm One',
      title: 'Dorm One',
      occupancy_rate: 75,
      occupied_slots: 6,
      total_slots: 8,
      monthly_revenue: 3000,
      revpar: 375,
    },
  ],
  room_performance: [],
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

describe('Landlord Analytics export smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    analyticsService.getProperties.mockResolvedValue({
      success: true,
      data: [{ id: 1, title: 'Dorm One' }],
    });

    analyticsService.getDashboardAnalytics.mockResolvedValue({
      success: true,
      data: analyticsFixture,
    });

    analyticsService.exportAnalyticsCsv.mockResolvedValue({
      success: true,
      data: 'metric,value\nTotal Revenue,12000',
      filename: 'analytics-export.csv',
    });

    FileSystem.writeAsStringAsync.mockResolvedValue();
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue();
  });

  it('renders analytics smoke content', async () => {
    renderWithQueryClient(<Analytics navigation={navigation} />);

    await screen.findByText('Analytics');
    await screen.findByText('Total Revenue', {}, { timeout: 6000 });
    await screen.findByText(/Property Performance Breakdown|Room Performance Breakdown/);

    expect(analyticsService.getDashboardAnalytics).toHaveBeenCalled();
  });

  it('exports CSV via backend payload when available', async () => {
    renderWithQueryClient(<Analytics navigation={navigation} />);

    await screen.findByText('Total Revenue', {}, { timeout: 6000 });

    fireEvent.press(screen.getByTestId('analytics-open-export-modal-button'));

    await screen.findByText('Export Analytics Report');

    fireEvent.press(screen.getByTestId('analytics-export-confirm-button'));

    await waitFor(() => {
      expect(analyticsService.exportAnalyticsCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          time_range: 'month',
          start_date: expect.any(String),
          end_date: expect.any(String),
        }),
      );
    });

    await waitFor(() => {
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/analytics-export.csv',
        'metric,value\nTotal Revenue,12000',
        { encoding: 'utf8' },
      );
    });

    expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith('/mock/documents/analytics-export.csv');
  });

  it('falls back to local CSV when backend export fails', async () => {
    analyticsService.exportAnalyticsCsv.mockResolvedValueOnce({
      success: false,
      error: 'Export endpoint unavailable',
    });

    renderWithQueryClient(<Analytics navigation={navigation} />);

    await screen.findByText('Total Revenue', {}, { timeout: 6000 });

    fireEvent.press(screen.getByTestId('analytics-open-export-modal-button'));
    await screen.findByText('Export Analytics Report');

    fireEvent.press(screen.getByTestId('analytics-export-confirm-button'));

    await waitFor(() => {
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('/mock/documents/Analytics_'),
        expect.stringContaining('AccommoTrack Analytics Report'),
      );
    });

    expect(Sharing.shareAsync).toHaveBeenCalled();
  });

  it('shows saved-file alert when sharing is unavailable', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    Sharing.isAvailableAsync.mockResolvedValueOnce(false);

    renderWithQueryClient(<Analytics navigation={navigation} />);

    await screen.findByText('Total Revenue', {}, { timeout: 6000 });

    fireEvent.press(screen.getByTestId('analytics-open-export-modal-button'));
    await screen.findByText('Export Analytics Report');

    fireEvent.press(screen.getByTestId('analytics-export-confirm-button'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Export complete',
        expect.stringContaining('/mock/documents/analytics-export.csv'),
      );
    });

    alertSpy.mockRestore();
  });
});
