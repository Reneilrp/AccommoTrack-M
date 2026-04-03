import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import RoomDetailsModal from '../RoomDetailsModal';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  loading: jest.fn(),
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../Shared/ImageCarousel', () => () => <div data-testid="image-carousel" />);
jest.mock('../../Shared/ImagePlaceholder', () => () => <div data-testid="image-placeholder" />);

const baseRoom = {
  id: 41,
  room_number: 'A-101',
  status: 'available',
  available_slots: 2,
  capacity: 2,
  room_type: 'single',
  billing_policy: 'monthly',
  pricing_model: 'full_room',
  monthly_rate: 12000,
  min_stay_days: 1,
};

const baseProperty = {
  id: 9,
  require_reservation_fee: false,
  reservation_fee_amount: 0,
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDateValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
};

const renderBookingForm = (bookingService) => {
  return render(
    <RoomDetailsModal
      room={baseRoom}
      property={baseProperty}
      onClose={jest.fn()}
      isAuthenticated
      onLoginRequired={jest.fn()}
      initialView="booking"
      onBookingSuccess={jest.fn()}
      bookingService={bookingService}
    />,
  );
};

describe('RoomDetailsModal proxy booking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        total: 12000,
        days: 30,
        breakdown: { months: 1, remaining_days: 0 },
      },
    });
  });

  it('blocks submit when proxy occupants are missing', async () => {
    const createBooking = jest.fn();

    const { container } = renderBookingForm({ createBooking });

    const bookingDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(bookingDateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking Request' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Proxy booking requires at least one occupant.');
    });

    expect(createBooking).not.toHaveBeenCalled();
  });

  it('submits proxy payload with booking_mode and occupants', async () => {
    const createBooking = jest.fn().mockResolvedValue({
      data: {
        booking: {
          id: 555,
          status: 'pending',
        },
      },
    });

    const { container } = renderBookingForm({ createBooking });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));

    fireEvent.change(screen.getByPlaceholderText('Full name*'), {
      target: { value: 'Jane Occupant' },
    });
    fireEvent.change(screen.getByPlaceholderText('Relationship to booker*'), {
      target: { value: 'child' },
    });

    const occupantDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(occupantDateInputs[occupantDateInputs.length - 1], {
      target: { value: '2010-05-01' },
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'female' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking Request' }));

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = createBooking.mock.calls[0][0];

    expect(payload.booking_mode).toBe('proxy');
    expect(payload.occupants).toEqual([
      {
        full_name: 'Jane Occupant',
        date_of_birth: '2010-05-01',
        gender: 'female',
        relationship_to_booker: 'child',
        phone: '',
        email: '',
      },
    ]);
  });
});
