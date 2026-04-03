import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuditExplorer from '../AuditExplorer';
import adminService from '../../../services/adminService';

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock('../../../services/adminService', () => ({
  __esModule: true,
  default: {
    getAuditLogs: jest.fn(),
    getAuditTimeline: jest.fn(),
  },
}));

const baseLog = {
  id: 19,
  domain: 'payment',
  event: 'payment.denied',
  severity: 'warning',
  summary: 'Proof verification failed',
  actorId: 3,
  subjectType: 'invoice',
  subjectId: 777,
  bookingId: 10,
  invoiceId: 777,
  paymentTransactionId: 88,
  tenantId: 90,
  landlordId: 50,
  propertyId: 12,
  metadata: {
    reason: 'invalid_proof',
  },
  createdAt: '2026-04-02T00:15:00.000Z',
  updatedAt: '2026-04-02T00:16:00.000Z',
};

const buildAuditLogsResponse = () => ({
  success: true,
  data: {
    items: [baseLog],
    pagination: {
      currentPage: 1,
      lastPage: 1,
      total: 1,
      from: 1,
      to: 1,
    },
  },
  message: '',
});

describe('AuditExplorer screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    adminService.getAuditLogs.mockResolvedValue(buildAuditLogsResponse());
    adminService.getAuditTimeline.mockResolvedValue({
      success: true,
      data: [
        {
          ...baseLog,
          id: 100,
          event: 'payment.pending_offline',
        },
        {
          ...baseLog,
          id: 101,
          event: 'payment.denied',
        },
      ],
      message: '',
    });
  });

  it('applies audit filters and calls logs endpoint with normalized params', async () => {
    render(<AuditExplorer />);

    await screen.findAllByText('payment.denied');

    fireEvent.change(screen.getByPlaceholderText('Domain (e.g. payment)'), {
      target: { value: 'payment' },
    });
    fireEvent.change(screen.getByPlaceholderText('Event (e.g. payment.denied)'), {
      target: { value: 'payment.denied' },
    });
    fireEvent.change(screen.getByPlaceholderText('Invoice ID'), {
      target: { value: '777' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          domain: 'payment',
          event: 'payment.denied',
          invoice_id: 777,
          page: 1,
        }),
      );
    });
  });

  it('opens timeline, then supports lookup and ordering changes', async () => {
    render(<AuditExplorer />);

    await screen.findAllByText('payment.denied');

    fireEvent.click(screen.getAllByRole('button', { name: 'Timeline' })[0]);

    await waitFor(() => {
      expect(adminService.getAuditTimeline).toHaveBeenCalledWith({
        entity_type: 'invoice',
        entity_id: '777',
        order: 'asc',
      });
    });

    await screen.findByText('Entity Timeline');

    const [entityTypeSelect, orderSelect] = screen.getAllByRole('combobox');

    fireEvent.change(entityTypeSelect, { target: { value: 'payment' } });
    fireEvent.change(screen.getByPlaceholderText('Entity ID'), {
      target: { value: '88' },
    });
    fireEvent.change(orderSelect, { target: { value: 'desc' } });

    fireEvent.click(screen.getByRole('button', { name: 'Load Timeline' }));

    await waitFor(() => {
      expect(adminService.getAuditTimeline).toHaveBeenLastCalledWith({
        entity_type: 'payment',
        entity_id: '88',
        order: 'desc',
      });
    });
  });
});
