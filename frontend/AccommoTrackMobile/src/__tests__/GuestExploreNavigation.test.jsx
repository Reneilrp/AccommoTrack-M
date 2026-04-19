import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { notifyManager } from '@tanstack/query-core';

import ExploreScreen from '../features/tenant/screens/Explore/ExploreScreen.jsx';
import PropertyDetailsScreen from '../features/tenant/screens/Explore/PropertyDetailsScreen.jsx';
import PropertyService from '../services/PropertyService.js';
import ReviewService from '../services/ReviewService.js';

jest.setTimeout(20000);

const mockNavigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
  goBack: jest.fn(),
  isFocused: jest.fn(() => false),
  getParent: jest.fn(() => ({ setOptions: jest.fn() })),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
        backgroundSecondary: '#f1f5f9',
        border: '#e2e8f0',
        borderLight: '#e5e7eb',
        success: '#16a34a',
        error: '#dc2626',
        warning: '#d97706',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

jest.mock('expo-video', () => ({
  VideoView: () => null,
  useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
}));

jest.mock('../styles/Tenant/HomePage.js', () => ({
  getStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../styles/Tenant/PropertyDetailsScreen.js', () => ({
  getStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../navigation/RootNavigation.js', () => ({
  navigate: jest.fn(),
  triggerForcedLogout: jest.fn(),
}));

jest.mock('../contexts/UIStateContext.jsx', () => ({
  useUIState: () => ({
    uiState: { data: {} },
    updateData: jest.fn(),
    invalidateData: jest.fn(),
  }),
}));

jest.mock('../features/tenant/hooks/useTenantQueryHelpers.js', () => ({
  tenantQueryKeys: {
    exploreProperties: (filters) => ['tenantExploreProperties', filters],
    explorePropertyDetails: (id, landlordPreview) => ['tenantExplorePropertyDetails', id, landlordPreview],
    explorePropertyReviews: (id) => ['tenantExplorePropertyReviews', id],
    explorePropertyStats: (id, userId) => ['tenantExplorePropertyStats', id, userId],
  },
  useTenantFocusRefetch: jest.fn(),
  useTenantRefreshHandler: () => jest.fn(),
}));

jest.mock('../features/tenant/components/SearchBar.jsx', () => () => null);

jest.mock('../features/tenant/components/MenuDrawer.jsx', () => () => null);

jest.mock('../features/tenant/components/PropertyCard.jsx', () => {
  const ReactNative = require('react-native');

  return {
    __esModule: true,
    default: ({ accommodation, onPress }) => (
      <ReactNative.TouchableOpacity
        testID={`property-card-${accommodation.id}`}
        onPress={() => onPress(accommodation)}
      >
        <ReactNative.Text>{accommodation.title || accommodation.name || `Property ${accommodation.id}`}</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    ),
  };
});

jest.mock('../components/Skeletons/index.jsx', () => ({
  PropertyCardSkeleton: () => null,
}));

jest.mock('../components/IconWithBadge.jsx', () => ({
  __esModule: true,
  default: ({ label, onPress }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.TouchableOpacity
        testID={`quick-action-${label}`}
        onPress={onPress}
      >
        <ReactNative.Text>{label}</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    );
  },
}));

jest.mock('../services/PropertyService.js', () => ({
  __esModule: true,
  default: {
    getPublicProperties: jest.fn(),
    transformPropertyToAccommodation: jest.fn(),
    getPublicProperty: jest.fn(),
    getProperty: jest.fn(),
    getPropertyStats: jest.fn(),
  },
}));

jest.mock('../services/ReviewService.js', () => ({
  __esModule: true,
  default: {
    getPropertyReviews: jest.fn(),
  },
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

const defaultQueryScheduler = (callback) => {
  setTimeout(callback, 0);
};

describe('Guest explore navigation', () => {
  beforeAll(() => {
    // Avoid setTimeout-based query notifications that can fire outside test act boundaries.
    notifyManager.setScheduler((callback) => {
      callback();
    });
  });

  afterAll(() => {
    notifyManager.setScheduler(defaultQueryScheduler);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    PropertyService.getPublicProperties.mockResolvedValue({
      success: true,
      data: [
        {
          id: 55,
          title: 'Guest House',
          property_type: 'apartment',
          available_rooms: 1,
          amenities: [],
        },
      ],
    });

    PropertyService.transformPropertyToAccommodation.mockImplementation((property) => ({
      id: property.id,
      title: property.title,
      name: property.title,
      type: property.property_type,
      availableRooms: property.available_rooms,
      amenities: property.amenities || [],
    }));

    PropertyService.getPublicProperty.mockResolvedValue({
      success: true,
      data: {
        id: 55,
        title: 'Guest House',
        property_type: 'apartment',
        available_rooms: 1,
        amenities: [],
        landlord_id: 7,
        user_id: 7,
        landlord_name: 'Landlord',
        rooms: [
          {
            id: 101,
            room_number: '101',
            monthly_rate: '5000',
            status: 'available',
            room_type: 'single',
            floor: 1,
            capacity: 1,
            available_slots: 1,
            images: [],
          },
        ],
      },
    });

    ReviewService.getPropertyReviews.mockResolvedValue({
      success: true,
      data: [],
      summary: null,
    });
  });

  it('lets guests open property details from explore without auth prompt', async () => {
    const onAuthRequired = jest.fn();

    renderWithQueryClient(
      <ExploreScreen
        onLogout={jest.fn()}
        isGuest={true}
        onAuthRequired={onAuthRequired}
      />,
    );

    const propertyCard = await screen.findByTestId('property-card-55', {}, { timeout: 8000 });
    fireEvent.press(propertyCard);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'AccommodationDetails',
        expect.objectContaining({
          accommodation: expect.objectContaining({ id: 55 }),
          isGuest: true,
          hideLayout: true,
        }),
      );
    });

    expect(onAuthRequired).not.toHaveBeenCalled();
  });

  it('lets guests open room details from property details without auth prompt', async () => {
    const onAuthRequired = jest.fn();

    renderWithQueryClient(
      <PropertyDetailsScreen
        route={{
          params: {
            accommodation: { id: 55, title: 'Guest House' },
          },
        }}
        isGuest={true}
        onAuthRequired={onAuthRequired}
      />,
    );

    const roomLabel = await screen.findByText('Room 101');
    fireEvent.press(roomLabel);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'RoomDetails',
        expect.objectContaining({
          room: expect.objectContaining({ id: 101 }),
          isGuest: true,
          hideLayout: true,
        }),
      );
    });

    expect(onAuthRequired).not.toHaveBeenCalled();
  });

  it('does not show tenant quick-action buttons on guest property details', async () => {
    renderWithQueryClient(
      <PropertyDetailsScreen
        route={{
          params: {
            accommodation: { id: 55, title: 'Guest House' },
          },
        }}
        isGuest={true}
      />,
    );

    await screen.findByText('Property Details');

    expect(screen.queryByTestId('quick-action-Add-ons')).toBeNull();
    expect(screen.queryByTestId('quick-action-Maintenance')).toBeNull();
    expect(screen.queryByTestId('quick-action-Activity')).toBeNull();
    expect(screen.queryByTestId('quick-action-Reviews')).toBeNull();
  });
});
