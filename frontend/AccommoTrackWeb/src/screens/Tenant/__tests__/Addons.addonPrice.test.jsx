import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Addons from '../Addons.jsx';

jest.mock('../../../services/tenantService', () => ({
  tenantService: {
    getAvailableAddons: jest.fn(),
    getAddonRequests: jest.fn(),
    requestAddon: jest.fn(),
    cancelAddonRequest: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Addons tenant request price smoke (web)', () => {
  const { tenantService } = jest.requireMock('../../../services/tenantService');

  beforeEach(() => {
    jest.clearAllMocks();

    tenantService.getAvailableAddons.mockResolvedValue({
      success: true,
      data: { available: [] },
    });

    tenantService.getAddonRequests.mockResolvedValue({
      success: true,
      data: {
        pending: [
          {
            id: 1,
            status: 'pending',
            quantity: 1,
            addon: {
              name: 'Air Purifier',
              price: 0,
            },
            pivot: {
              price_at_booking: 250,
            },
          },
        ],
        active: [],
      },
    });
  });

  it('renders request amount from pivot/effective price instead of addon base 0', async () => {
    render(<Addons />);

    await screen.findByText('Your Requests');

    await waitFor(() => {
      expect(screen.getByText('Qty: 1 • ₱250')).toBeInTheDocument();
    });

    expect(screen.queryByText('Qty: 1 • ₱0')).not.toBeInTheDocument();
  });
});
