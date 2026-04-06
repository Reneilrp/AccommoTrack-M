import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import InvoiceCheckout from '../InvoiceCheckout.jsx';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: '123' }),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../services/systemToggleService', () => ({
  __esModule: true,
  default: {
    getDefaults: () => ({ tenantPaymentsDisabled: false }),
    getToggles: jest.fn().mockResolvedValue({ data: { tenantPaymentsDisabled: false } }),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('InvoiceCheckout add-on/refund regression (web)', () => {
  const api = jest.requireMock('../../../utils/api').default;

  beforeEach(() => {
    jest.clearAllMocks();

    api.get.mockResolvedValue({
      data: {
        id: 123,
        reference: 'INV-9001',
        amount_cents: 100000,
        subtotal_cents: 100000,
        tax_cents: 0,
        total_cents: 100000,
        description: 'Monthly Rent',
        transactions: [
          { id: 1, status: 'paid', amount_cents: 50000 },
          {
            id: 2,
            status: 'partially_refunded',
            amount_cents: 40000,
            refunded_amount_cents: 10000,
          },
        ],
        booking: {
          payment_plan: 'monthly',
          monthly_rent: 1000,
          room: { room_number: 'A-1' },
          property: { require_1month_advance: false },
          addons: [
            {
              id: 10,
              name: 'Wi-Fi',
              pivot: { id: 501, quantity: 1, price_at_booking: 150 },
            },
            {
              id: 20,
              name: 'Parking',
              pivot: { id: 502, quantity: 2, price_at_booking: 200 },
            },
          ],
        },
        property: {
          title: 'Sample Property',
          accepted_payments: ['cash'],
          allow_partial_payments: true,
          landlord: { payment_methods_settings: { allowed: ['cash'], details: {} } },
        },
        metadata: {
          addons: [
            { addon_id: 10, addon_name: 'Wi-Fi', quantity: 1, price: 15000 },
          ],
        },
      },
    });
  });

  it('shows merged add-on lines and computes remaining with partial refund netting', async () => {
    render(<InvoiceCheckout />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/tenant/payments/123');
    });

    await waitFor(() => {
      expect(screen.getByText('Wi-Fi')).toBeInTheDocument();
      expect(screen.getByText('Parking x 2')).toBeInTheDocument();
    });

    expect(screen.getByText('Add-ons Total')).toBeInTheDocument();
    expect(screen.getByText('₱550')).toBeInTheDocument();

    expect(screen.getByText('Remaining Balance')).toBeInTheDocument();
    expect(screen.getByText('₱200')).toBeInTheDocument();
  });
});
