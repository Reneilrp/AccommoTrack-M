import bookingService from '../bookingService';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('bookingService (web)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('createBooking posts payload and returns raw response data', async () => {
    const payload = { room_id: 41, booking_mode: 'proxy' };
    const apiBody = { success: true, data: { booking: { id: 555 } } };

    api.post.mockResolvedValue({ data: apiBody });

    const result = await bookingService.createBooking(payload);

    expect(api.post).toHaveBeenCalledWith('/bookings', payload);
    expect(result).toEqual(apiBody);
  });

  it('createBooking rethrows request failures', async () => {
    const error = new Error('network error');
    api.post.mockRejectedValue(error);

    await expect(bookingService.createBooking({ room_id: 9 })).rejects.toBe(error);
  });

  it('getBookings unwraps nested data and forwards query params', async () => {
    const bookings = [{ id: 1 }, { id: 2 }];
    api.get.mockResolvedValue({ data: { data: bookings } });

    const result = await bookingService.getBookings({ property_id: 7, status: 'pending' });

    expect(api.get).toHaveBeenCalledWith('/bookings', {
      params: { property_id: 7, status: 'pending' },
    });
    expect(result).toEqual({ success: true, data: bookings });
  });

  it('getBookings treats 404 as empty successful list', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });

    const result = await bookingService.getBookings();

    expect(result).toEqual({ success: true, data: [] });
  });

  it('getBookings normalizes non-empty failures', async () => {
    api.get.mockRejectedValue({
      response: {
        status: 500,
        data: { message: 'Unable to load bookings' },
      },
    });

    const result = await bookingService.getBookings();

    expect(result).toEqual({
      success: false,
      status: 500,
      error: 'Unable to load bookings',
    });
  });

  it('finalizeCheckout returns data plus top-level message', async () => {
    api.post.mockResolvedValue({
      data: {
        data: { settlement_id: 88 },
        message: 'Checkout finalized',
      },
    });

    const result = await bookingService.finalizeCheckout(77, { apply_credit: true });

    expect(api.post).toHaveBeenCalledWith('/bookings/77/finalize-checkout', { apply_credit: true });
    expect(result).toEqual({
      success: true,
      data: { settlement_id: 88 },
      message: 'Checkout finalized',
    });
  });
});
