import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import PaymentOversight from '../PaymentOversight';
import adminService from '../../../services/adminService';

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock('../../../services/adminService', () => ({
  __esModule: true,
  default: {
    getPaymentOversightQueue: jest.fn(),
    overrideApprovePayment: jest.fn(),
  },
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  getImageUrl: jest.fn((path) => `https://cdn.example.test/${path}`),
}));

const deniedRecord = {
  id: 1,
  invoiceId: 777,
  invoiceReference: 'INV-777',
  bookingId: 10,
  bookingReference: 'BKG-10',
  roomNumber: 'A-101',
  propertyId: 12,
  propertyTitle: 'Alpha Residences',
  landlordId: 50,
  tenantId: 90,
  tenantName: 'Jane Doe',
  amountCents: 125000,
  method: 'bank_transfer',
  reference: 'TX-REF-1',
  proofImageUrl: 'https://images.example.test/proof.png',
  proofImagePath: null,
  status: 'denied',
  transactionStatus: 'voided',
  denialReasonCode: 'invalid_proof',
  denialReason: 'Image is unreadable',
  riskFlags: ['multiple_denials_tenant'],
  submittedAt: '2026-04-02T02:00:00.000Z',
  updatedAt: '2026-04-02T03:00:00.000Z',
};

const buildQueueResponse = (overrides = {}) => ({
  success: true,
  data: {
    items: [deniedRecord],
    pagination: {
      currentPage: 2,
      lastPage: 3,
      total: 1,
      from: 1,
      to: 1,
      ...overrides,
    },
  },
  message: '',
});

describe('PaymentOversight screen', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);

    adminService.getPaymentOversightQueue.mockResolvedValue(buildQueueResponse());
    adminService.overrideApprovePayment.mockResolvedValue({
      success: true,
      message: 'Payment override applied successfully.',
      data: {},
    });
  });

  afterAll(() => {
    window.confirm = originalConfirm;
  });

  it('applies filters and forwards normalized params to queue service', async () => {
    render(<PaymentOversight />);

    await screen.findAllByText('INV-777');

    fireEvent.change(screen.getByDisplayValue('Status: Pending'), {
      target: { value: 'denied' },
    });
    fireEvent.change(screen.getByPlaceholderText('Property ID'), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tenant ID'), {
      target: { value: '90' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    await waitFor(() => {
      expect(adminService.getPaymentOversightQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'denied',
          property_id: 12,
          tenant_id: 90,
          page: 1,
        }),
      );
    });
  });

  it('requires an override note before sending override approval request', async () => {
    render(<PaymentOversight />);

    await screen.findAllByText('INV-777');

    fireEvent.click(screen.getAllByRole('button', { name: 'Override' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Override' }));

    expect(toast.error).toHaveBeenCalledWith('Override note is required.');
    expect(adminService.overrideApprovePayment).not.toHaveBeenCalled();
  });

  it('submits override approval and refreshes queue on success', async () => {
    render(<PaymentOversight />);

    await screen.findAllByText('INV-777');

    fireEvent.click(screen.getAllByRole('button', { name: 'Override' })[0]);
    fireEvent.change(screen.getByPlaceholderText('Provide a clear justification for this admin override.'), {
      target: { value: '  Verified manually by admin team.  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Override' }));

    await waitFor(() => {
      expect(adminService.overrideApprovePayment).toHaveBeenCalledWith(777, {
        note: 'Verified manually by admin team.',
      });
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Payment override applied successfully.');

    await waitFor(() => {
      expect(adminService.getPaymentOversightQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });
});
