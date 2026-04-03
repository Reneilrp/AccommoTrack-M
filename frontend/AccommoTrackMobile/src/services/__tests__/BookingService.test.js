import BookingService from '../BookingService.js';
import api from '../api.js';

jest.mock('../api.js', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('BookingService (mobile)', () => {
  let originalFormData;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFormData = global.FormData;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.FormData = originalFormData;
    consoleErrorSpy.mockRestore();
  });

  it('createBooking sends plain payload without multipart header', async () => {
    api.post.mockResolvedValue({ data: { booking: { id: 321 } } });

    const result = await BookingService.createBooking({ room_id: 8 });

    expect(api.post).toHaveBeenCalledWith('/bookings', { room_id: 8 }, { headers: {} });
    expect(result).toEqual({
      success: true,
      data: { booking: { id: 321 } },
    });
  });

  it('createBooking sends multipart header for FormData payload', async () => {
    class MockFormData {}
    global.FormData = MockFormData;

    api.post.mockResolvedValue({ data: { booking: { id: 654 } } });

    const payload = new FormData();
    const result = await BookingService.createBooking(payload);

    expect(api.post).toHaveBeenCalledWith('/bookings', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(result).toEqual({
      success: true,
      data: { booking: { id: 654 } },
    });
  });

  it('createBooking returns authError on 401', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 401,
      },
    });

    const result = await BookingService.createBooking({ room_id: 10 });

    expect(result).toEqual({
      success: false,
      error: 'Authentication failed. Your session may have expired. Please login again.',
      authError: true,
    });
  });

  it('searchGuests returns empty data and default message on failure', async () => {
    api.get.mockRejectedValue({});

    const result = await BookingService.searchGuests('ja');

    expect(api.get).toHaveBeenCalledWith('/users/search', {
      params: { query: 'ja' },
    });
    expect(result).toEqual({
      success: false,
      data: [],
      error: 'Failed to search guests',
    });
  });
});
