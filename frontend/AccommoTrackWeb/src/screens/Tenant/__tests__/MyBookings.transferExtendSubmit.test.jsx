import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyBookings from '../MyBookings.jsx';

const mockNavigate = jest.fn();
const mockUpdateScreenState = jest.fn();
const mockUpdateData = jest.fn();
const mockInvalidateData = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../contexts/UIStateContext', () => ({
  useUIState: () => ({
    uiState: {
      bookings: { activeTab: 'current' },
      data: {},
    },
    updateScreenState: mockUpdateScreenState,
    updateData: mockUpdateData,
    invalidateData: mockInvalidateData,
  }),
}));

jest.mock('../../../services/tenantService', () => ({
  tenantService: {
    getCurrentStay: jest.fn(),
    getBookings: jest.fn(),
    getHistory: jest.fn(),
    requestAddon: jest.fn(),
    cancelAddonRequest: jest.fn(),
    requestMoveOut: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
  getImageUrl: jest.fn(() => null),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

const { tenantService } = jest.requireMock('../../../services/tenantService');
const api = jest.requireMock('../../../utils/api').default;

const buildIsoDate = (offsetDays) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

const buildStay = () => ({
  booking: {
    id: 11,
    startDate: buildIsoDate(-15),
    endDate: buildIsoDate(10),
    monthlyRent: 8000,
    unit_price: 8000,
    contract_mode: 'monthly',
    contractMode: 'monthly',
    billing_policy: 'monthly',
    status: 'active',
    paymentStatus: 'paid',
    daysStayed: 15,
    daysRemaining: 10,
    totalMonths: 1,
    hasReview: false,
    has_review: false,
  },
  room: {
    id: 21,
    roomNumber: 'A-101',
    room_number: 'A-101',
    daily_rate: 300,
  },
  property: {
    id: 31,
    title: 'Dorm Prime',
    address: '123 Main Street',
    image: null,
  },
  landlord: {
    id: 99,
    name: 'Owner Prime',
    email: 'owner@prime.test',
    phone: '09171234567',
  },
  addons: {
    active: [],
    pending: [],
    available: [],
    monthlyTotal: 0,
  },
});

describe('MyBookings transfer/extend submit flows (web)', () => {
  let mockStay;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStay = buildStay();

    tenantService.getCurrentStay.mockResolvedValue({
      stays: [mockStay],
      pendingCheckIns: [],
      upcomingBooking: null,
    });

    tenantService.getBookings.mockResolvedValue({
      bookings: [],
    });

    tenantService.getHistory.mockResolvedValue({
      bookings: [],
      pagination: null,
    });

    api.get.mockImplementation((url) => {
      if (url === '/tenant/transfers') {
        return Promise.resolve({ data: { data: [] } });
      }

      if (url === '/tenant/transfers/options') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 55,
                room_number: 'B-202',
                type_label: 'Standard',
                monthly_rate: 9000,
              },
            ],
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    api.post.mockResolvedValue({ data: { success: true } });
    api.patch.mockResolvedValue({ data: { success: true } });
  });

  it('submits extend-stay request payload from Extension modal', async () => {
    render(<MyBookings />);

    const extendButton = await screen.findByRole('button', { name: 'Extend Stay' });
    fireEvent.click(extendButton);

    const sendRequest = await screen.findByRole('button', { name: 'Send Request' });
    fireEvent.click(sendRequest);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/bookings/11/extend',
        expect.objectContaining({
          booking_id: 11,
          extension_type: 'monthly',
          requested_end_date: expect.any(String),
        }),
      );
    });

    const expectedDate = new Date(mockStay.booking.endDate);
    expectedDate.setMonth(expectedDate.getMonth() + 1);

    const extensionPayload = api.post.mock.calls.find(([url]) => url === '/bookings/11/extend')?.[1];
    expect(extensionPayload?.requested_end_date).toBe(expectedDate.toISOString().split('T')[0]);
    expect(mockInvalidateData).toHaveBeenCalledWith(['dashboard', 'bookings']);
  });

  it('submits transfer request payload from Transfer modal', async () => {
    render(<MyBookings />);

    const transferButton = await screen.findByRole('button', { name: 'Transfer' });
    fireEvent.click(transferButton);

    const continueButton = await screen.findByRole('button', { name: 'I Understand, Continue' });
    fireEvent.click(continueButton);

    await screen.findByText('Request Room Transfer');

    const roomSelect = screen.getByRole('combobox');
    fireEvent.change(roomSelect, { target: { value: '55' } });

    const reasonInput = screen.getByPlaceholderText(/I need a room with a better view/i);
    fireEvent.change(reasonInput, { target: { value: 'Need quieter room for work schedule.' } });

    const sendRequest = screen.getByRole('button', { name: 'Send Request' });
    fireEvent.click(sendRequest);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tenant/transfers',
        expect.objectContaining({
          booking_id: 11,
          property_id: 31,
          requested_room_id: '55',
          reason: 'Need quieter room for work schedule.',
          new_end_date: null,
        }),
      );
    });

    expect(mockInvalidateData).toHaveBeenCalledWith(['dashboard', 'bookings']);
  });
});
