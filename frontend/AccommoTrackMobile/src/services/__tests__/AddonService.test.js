import AddonService from '../AddonService.js';
import api from '../api.js';

jest.mock('../api.js', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
  },
}));

describe('AddonService handleAddonRequest smoke (mobile)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('sends approved_price=250 when approving with a valid price', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });

    const result = await AddonService.handleAddonRequest(31, 42, 'approve', 'approved', 250);

    expect(api.patch).toHaveBeenCalledWith('/landlord/bookings/31/addons/42', {
      action: 'approve',
      note: 'approved',
      approved_price: 250,
    });
    expect(result).toEqual({
      success: true,
      data: { success: true },
      error: null,
    });
  });

  it('does not send approved_price when approving with non-positive price', async () => {
    api.patch.mockResolvedValue({ data: { ok: true } });

    await AddonService.handleAddonRequest(31, 42, 'approve', null, 0);

    expect(api.patch).toHaveBeenCalledWith('/landlord/bookings/31/addons/42', {
      action: 'approve',
      note: null,
    });
  });

  it('does not send approved_price for reject action even when a value is passed', async () => {
    api.patch.mockResolvedValue({ data: { ok: true } });

    await AddonService.handleAddonRequest(31, 42, 'reject', 'rejected', 250);

    expect(api.patch).toHaveBeenCalledWith('/landlord/bookings/31/addons/42', {
      action: 'reject',
      note: 'rejected',
    });
  });
});
