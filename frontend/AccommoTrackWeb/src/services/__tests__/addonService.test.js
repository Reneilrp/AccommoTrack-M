import { addonService } from '../addonService';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
  },
}));

describe('addonService handleAddonRequest smoke (web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends approved_price=250 when approving with a valid price', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });

    await addonService.handleAddonRequest(11, 22, 'approve', 'looks good', 250);

    expect(api.patch).toHaveBeenCalledWith('/landlord/bookings/11/addons/22', {
      action: 'approve',
      note: 'looks good',
      approved_price: 250,
    });
  });

  it('does not send approved_price when approving without a positive value', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });

    await addonService.handleAddonRequest(11, 22, 'approve', null, 0);

    expect(api.patch).toHaveBeenCalledWith('/landlord/bookings/11/addons/22', {
      action: 'approve',
      note: null,
    });
  });

  it('does not send approved_price for reject action even when value is provided', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });

    await addonService.handleAddonRequest(11, 22, 'reject', 'no stock', 250);

    expect(api.patch).toHaveBeenCalledWith('/landlord/bookings/11/addons/22', {
      action: 'reject',
      note: 'no stock',
    });
  });
});
