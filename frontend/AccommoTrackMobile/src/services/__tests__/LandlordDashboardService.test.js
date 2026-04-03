import LandlordDashboardService from '../LandlordDashboardService.js';
import api from '../api.js';

jest.mock('../api.js', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('LandlordDashboardService unread count smoke', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('normalizes unread count from supported payload envelopes', async () => {
    const payloads = [
      { count: 5 },
      { data: { count: '7' } },
      { unread_count: 3 },
      { data: { unread_count: '9' } },
      4,
    ];

    const expectedCounts = [5, 7, 3, 9, 4];

    for (let i = 0; i < payloads.length; i += 1) {
      api.get.mockResolvedValueOnce({ data: payloads[i] });
      const result = await LandlordDashboardService.fetchUnreadNotificationsCount();

      expect(result).toEqual({ success: true, data: expectedCounts[i] });
    }
  });

  it('falls back to 0 for invalid payload values', async () => {
    api.get.mockResolvedValue({ data: { data: { count: 'not-a-number' } } });

    const result = await LandlordDashboardService.fetchUnreadNotificationsCount();

    expect(result).toEqual({ success: true, data: 0 });
  });

  it('returns failure shape with zero count when request errors', async () => {
    api.get.mockRejectedValue(new Error('network down'));

    const result = await LandlordDashboardService.fetchUnreadNotificationsCount();

    expect(result).toEqual({ success: false, data: 0 });
  });
});
