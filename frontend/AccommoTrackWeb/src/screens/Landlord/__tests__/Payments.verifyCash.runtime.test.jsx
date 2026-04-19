import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { showSuccess } from '../../../utils/toast';
import Payments from '../Payments';
import invoiceService from '../../../services/invoiceService';

const mockUpdateData = jest.fn();
const mockInvalidateData = jest.fn();
const mockNavigate = jest.fn();
let mockSearch = '';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockSearch }),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../utils/toast', () => ({
  showSuccess: jest.fn(),
}));

jest.mock('../../../contexts/UIStateContext', () => ({
  useUIState: () => ({
    uiState: { data: {} },
    updateData: mockUpdateData,
    invalidateData: mockInvalidateData,
  }),
}));

jest.mock('../../../utils/mutationFreshness', () => ({
  LANDLORD_MUTATION_FRESHNESS: {
    uiBuckets: [],
    cacheKeys: [],
    cachePrefixes: [],
  },
  refreshAfterMutation: jest.fn(),
}));

jest.mock('../../../services/invoiceService', () => ({
  __esModule: true,
  default: {
    getInvoices: jest.fn(),
    getSummary: jest.fn(),
    verifyCash: jest.fn(),
    recordPayment: jest.fn(),
    refundTransaction: jest.fn(),
  },
}));

jest.mock('../../../services/bookingService', () => ({
  __esModule: true,
  default: {
    getBooking: jest.fn(),
    recordPayment: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('../../../services/roomService', () => ({
  __esModule: true,
  default: {
    getRoomsByProperty: jest.fn(),
  },
}));

const pendingVerificationInvoice = {
  id: 501,
  reference: 'INV-501',
  status: 'pending_verification',
  amount_cents: 500000,
  tenant: {
    first_name: 'Jane',
    last_name: 'Doe',
  },
  booking: {
    property: { title: 'Alpha Residences' },
    room_number: 'A-101',
  },
  transactions: [],
};

describe('Landlord Payments runtime cash verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = '';

    invoiceService.getInvoices.mockResolvedValue({
      success: true,
      data: [pendingVerificationInvoice],
    });

    invoiceService.getSummary.mockResolvedValue({
      success: true,
      data: {
        totals: {
          total_paid: 0,
          total_balance: 5000,
          paid_count: 0,
          unpaid_count: 0,
          overdue_count: 0,
          pending_count: 0,
          pending_verification_count: 1,
        },
      },
    });

    invoiceService.verifyCash.mockResolvedValue({
      success: true,
      data: { verified: true },
    });
  });

  it('approves a pending-verification invoice from the manage modal', async () => {
    render(<Payments />);

    await screen.findByText('INV-501');

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    fireEvent.click(await screen.findByRole('button', { name: /Approve Payment/i }));

    await waitFor(() => {
      expect(invoiceService.verifyCash).toHaveBeenCalledWith(501, { action: 'approve' });
    });

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Cash payment approved — invoice marked as Paid.');
    });

    await waitFor(() => {
      expect(invoiceService.getInvoices).toHaveBeenCalledTimes(2);
    });
  });

  it('rejects a pending-verification invoice with structured reason payload', async () => {
    render(<Payments />);

    await screen.findByText('INV-501');

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    fireEvent.click(await screen.findByRole('button', { name: /Reject Payment/i }));

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'wrong_amount' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Explain what is wrong so the tenant can correct and resubmit.'),
      { target: { value: '  Proof is unreadable  ' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Confirm Rejection/i }));

    await waitFor(() => {
      expect(invoiceService.verifyCash).toHaveBeenCalledWith(501, {
        action: 'reject',
        reason_code: 'wrong_amount',
        reason: 'Proof is unreadable',
      });
    });

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Cash payment rejected — tenant will be notified.');
    });
  });
});
