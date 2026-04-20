import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { showError } from '../../../utils/toast';
import api from '../../../utils/api';
import RoomDetailsModal from '../RoomDetailsModal';

const mockNavigate = jest.fn();
const mockAddToCart = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../utils/toast', () => ({
  showError: jest.fn(),
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../../services/systemToggleService', () => ({
  __esModule: true,
  default: {
    getDefaults: () => ({ reservationFeeDisabled: false }),
    getToggles: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../contexts/CartContext.jsx', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    addItem: mockAddToCart,
  }),
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

const getDateValueFromToday = (daysFromToday) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysFromToday);
  return toDateInputValue(targetDate);
};

const agreeToRulesAndSubmit = () => {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Confirm Booking Request|Pay/ }));
};

const renderBookingForm = (bookingService, propertyOverrides = {}, roomOverrides = {}) => {
  const property = {
    ...baseProperty,
    ...propertyOverrides,
  };

  const room = {
    ...baseRoom,
    ...roomOverrides,
  };

  return render(
    <RoomDetailsModal
      room={room}
      property={property}
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
    window.localStorage.clear();
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

    expect(showError).toHaveBeenCalledWith('Proxy booking requires at least one occupant.');

    expect(createBooking).not.toHaveBeenCalled();
  });

  it('defaults proxy occupant sex to room restriction', async () => {
    const createBooking = jest.fn().mockResolvedValue({
      data: {
        booking: {
          id: 556,
          status: 'pending',
        },
      },
    });

    const { container } = renderBookingForm(
      { createBooking },
      {},
      { sex_restriction: 'female' },
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Default' },
    });
    fireEvent.change(screen.getByPlaceholderText('Middle name'), {
      target: { value: 'Sex' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Occupant' },
    });
    fireEvent.change(screen.getByPlaceholderText('Relationship to booker'), {
      target: { value: 'sister' },
    });

    const occupantDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(occupantDateInputs[occupantDateInputs.length - 1], {
      target: { value: '1992-05-01' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking Request' }));

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = createBooking.mock.calls[0][0];
    expect(payload.booking_mode).toBe('proxy');
    expect(payload.occupants).toEqual([
      expect.objectContaining({
        first_name: 'Default',
        middle_name: 'Sex',
        last_name: 'Occupant',
        date_of_birth: '1992-05-01',
        sex: 'female',
        relationship_to_booker: 'sister',
        phone: '',
        email: '',
      }),
    ]);
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

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Occupant' },
    });
    fireEvent.change(screen.getByPlaceholderText('Relationship to booker'), {
      target: { value: 'child' },
    });

    const occupantDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(occupantDateInputs[occupantDateInputs.length - 1], {
      target: { value: '1990-05-01' },
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
      expect.objectContaining({
        first_name: 'Jane',
        middle_name: '',
        last_name: 'Occupant',
        date_of_birth: '1990-05-01',
        sex: 'female',
        relationship_to_booker: 'child',
        phone: '',
        email: '',
      }),
    ]);
  });

  it('blocks submit when proxy occupant is below 18 years old', async () => {
    const createBooking = jest.fn();

    const { container } = renderBookingForm({ createBooking });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Young' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Occupant' },
    });
    fireEvent.change(screen.getByPlaceholderText('Relationship to booker'), {
      target: { value: 'child' },
    });

    const occupantDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(occupantDateInputs[occupantDateInputs.length - 1], {
      target: { value: '2012-05-01' },
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'female' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking Request' }));

    expect(showError).toHaveBeenCalledWith('Occupant 1 must be at least 18 years old.');

    expect(createBooking).not.toHaveBeenCalled();
  });

  it('shows static 1 bed info when only one bed can be booked', () => {
    const createBooking = jest.fn();

    const { container } = renderBookingForm(
      { createBooking },
      {},
      {
        room_type: 'bedspacer',
        pricing_model: 'per_bed',
        available_slots: 1,
        capacity: 1,
      },
    );

    expect(screen.getByText('1 Bed')).toBeInTheDocument();
    expect(container.querySelectorAll('select')).toHaveLength(0);
  });

  it('shows bed selector options when room allows more than one bed', () => {
    const createBooking = jest.fn();

    const { container } = renderBookingForm(
      { createBooking },
      {},
      {
        room_type: 'bedspacer',
        pricing_model: 'per_bed',
        available_slots: 2,
        capacity: 2,
      },
    );

    expect(container.querySelectorAll('select')).toHaveLength(1);
    expect(screen.getByRole('option', { name: '1 Bed' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2 Beds' })).toBeInTheDocument();
  });

  it('submits selected multi-bed count for proxy bookings on per-bed rooms', async () => {
    const createBooking = jest.fn().mockResolvedValue({
      data: {
        booking: {
          id: 557,
          status: 'pending',
        },
      },
    });

    const { container } = renderBookingForm(
      { createBooking },
      {},
      {
        room_type: 'single',
        pricing_model: 'per_bed',
        available_slots: 3,
        capacity: 3,
        sex_restriction: 'female',
      },
    );

    const initialDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(initialDateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Occupant' }));

    const firstNameInputs = screen.getAllByPlaceholderText('First name');
    const lastNameInputs = screen.getAllByPlaceholderText('Last name');
    fireEvent.change(firstNameInputs[0], {
      target: { value: 'ProxyOne' },
    });
    fireEvent.change(lastNameInputs[0], {
      target: { value: 'Occupant' },
    });
    fireEvent.change(firstNameInputs[1], {
      target: { value: 'ProxyTwo' },
    });
    fireEvent.change(lastNameInputs[1], {
      target: { value: 'Occupant' },
    });

    const relationshipInputs = screen.getAllByPlaceholderText('Relationship to booker');
    fireEvent.change(relationshipInputs[0], {
      target: { value: 'friend' },
    });
    fireEvent.change(relationshipInputs[1], {
      target: { value: 'friend' },
    });

    const dateInputsWithOccupants = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputsWithOccupants[dateInputsWithOccupants.length - 2], {
      target: { value: '1990-05-01' },
    });
    fireEvent.change(dateInputsWithOccupants[dateInputsWithOccupants.length - 1], {
      target: { value: '1991-06-01' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking Request' }));

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = createBooking.mock.calls[0][0];
    expect(payload.booking_mode).toBe('proxy');
    expect(payload.bed_count).toBe(2);
    expect(payload.occupants).toHaveLength(2);
  });

  it('smoke: shows normal booking validation toasts', async () => {
    const createBooking = jest.fn();

    const { container, unmount } = renderBookingForm({ createBooking });
    const dateInputs = container.querySelectorAll('input[type="date"]');

    fireEvent.change(dateInputs[0], { target: { value: '' } });
    agreeToRulesAndSubmit();

    expect(showError).toHaveBeenCalledWith('Please select a move-in date.');
    expect(createBooking).not.toHaveBeenCalled();

    unmount();
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        total: 12000,
        days: 30,
        breakdown: { months: 1, remaining_days: 0 },
      },
    });

    const second = renderBookingForm({ createBooking });
    const secondDateInputs = second.container.querySelectorAll('input[type="date"]');
    const tomorrow = getTomorrowDateValue();
    fireEvent.change(secondDateInputs[0], { target: { value: tomorrow } });
    fireEvent.change(secondDateInputs[1], { target: { value: tomorrow } });
    agreeToRulesAndSubmit();

    expect(showError).toHaveBeenCalledWith('Move-out date must be after move-in date.');
    expect(createBooking).not.toHaveBeenCalled();

    second.unmount();
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        total: 12000,
        days: 30,
        breakdown: { months: 1, remaining_days: 0 },
      },
    });

    const third = renderBookingForm({ createBooking });
    const thirdDateInputs = third.container.querySelectorAll('input[type="date"]');
    const nextDay = getDateValueFromToday(2);
    fireEvent.change(thirdDateInputs[0], { target: { value: getTomorrowDateValue() } });
    fireEvent.change(thirdDateInputs[1], { target: { value: nextDay } });
    agreeToRulesAndSubmit();

    expect(showError).not.toHaveBeenCalledWith('The minimum stay for this room is 30 days.');
    expect(createBooking).toHaveBeenCalled();

    third.unmount();
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        total: 12000,
        days: 30,
        breakdown: { months: 1, remaining_days: 0 },
      },
    });

    const fourth = renderBookingForm({ createBooking });
    const fourthDateInputs = fourth.container.querySelectorAll('input[type="date"]');
    fireEvent.change(fourthDateInputs[0], {
      target: { value: getDateValueFromToday(120) },
    });
    agreeToRulesAndSubmit();

    expect(showError).toHaveBeenCalledWith('You cannot book a room more than 3 months in advance.');
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('smoke: shows proxy booking validation toasts', async () => {
    const createBooking = jest.fn();

    const { container, unmount } = renderBookingForm({ createBooking });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Toast' },
    });

    agreeToRulesAndSubmit();

    expect(showError).toHaveBeenCalledWith('Occupant 1: last name is required.');
    expect(createBooking).not.toHaveBeenCalled();

    unmount();
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        total: 12000,
        days: 30,
        breakdown: { months: 1, remaining_days: 0 },
      },
    });

    const second = renderBookingForm({ createBooking });
    const secondDateInputs = second.container.querySelectorAll('input[type="date"]');
    fireEvent.change(secondDateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Future DOB' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Occupant' },
    });
    fireEvent.change(screen.getByPlaceholderText('Relationship to booker'), {
      target: { value: 'child' },
    });

    const occupantDateInputs = second.container.querySelectorAll('input[type="date"]');
    fireEvent.change(occupantDateInputs[occupantDateInputs.length - 1], {
      target: { value: toDateInputValue(new Date()) },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'female' },
    });

    agreeToRulesAndSubmit();

    expect(showError).toHaveBeenCalledWith('Occupant 1: date of birth must be before today.');
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('keeps booking CTA as no-fee when move-in is within three days', async () => {
    const createBooking = jest.fn();

    const { container } = renderBookingForm(
      { createBooking },
      {
        require_reservation_fee: true,
        reservation_fee_amount: 1500,
      },
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getDateValueFromToday(2) },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Confirm Booking Request' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getAllByText('No reservation fee for move-in within 3 days from booking date.').length,
    ).toBeGreaterThan(0);
  });

  it('switches CTA to reservation payment when move-in is more than three days away', async () => {
    const createBooking = jest.fn();

    const { container } = renderBookingForm(
      { createBooking },
      {
        require_reservation_fee: true,
        reservation_fee_amount: 1500,
      },
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getDateValueFromToday(4) },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Pay ₱1,500 to Reserve' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Reservation fee is required because move-in is 4 days after booking date.'),
    ).toBeInTheDocument();
  });

  it('allows proxy booking on sex-restricted rooms even when normal mode is incompatible', async () => {
    const createBooking = jest.fn().mockResolvedValue({
      data: {
        booking: {
          id: 888,
          status: 'pending',
        },
      },
    });

    window.localStorage.setItem(
      'userData',
      JSON.stringify({ sex: 'female' }),
    );

    const { container } = render(
      <RoomDetailsModal
        room={{ ...baseRoom, sex_restriction: 'male' }}
        property={{ ...baseProperty, property_type: 'dormitory' }}
        onClose={jest.fn()}
        isAuthenticated
        onLoginRequired={jest.fn()}
        initialView="booking"
        onBookingSuccess={jest.fn()}
        bookingService={{ createBooking }}
      />,
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], {
      target: { value: getTomorrowDateValue() },
    });

    const normalSubmitButton = screen.getByRole('button', {
      name: 'Confirm Booking Request',
    });
    expect(normalSubmitButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Proxy' }));

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Proxy' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Occupant' },
    });
    fireEvent.change(screen.getByPlaceholderText('Relationship to booker'), {
      target: { value: 'brother' },
    });

    const occupantDateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(occupantDateInputs[occupantDateInputs.length - 1], {
      target: { value: '1992-05-01' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Booking Request' }));

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledTimes(1);
    });

    const payload = createBooking.mock.calls[0][0];
    expect(payload.booking_mode).toBe('proxy');
    expect(payload.occupants).toEqual([
      expect.objectContaining({
        first_name: 'Proxy',
        last_name: 'Occupant',
        sex: 'male',
      }),
    ]);
  });
});
