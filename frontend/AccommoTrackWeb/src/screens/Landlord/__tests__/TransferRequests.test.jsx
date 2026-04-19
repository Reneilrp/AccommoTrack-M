import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { showSuccess, showError } from '../../../utils/toast';
import api from '../../../utils/api';
import TransferRequests from '../TransferRequests';

const mockNavigate = jest.fn();
let mockSearch = '';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: mockSearch }),
}));

jest.mock('../../../utils/toast', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}));

jest.mock('../../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const pendingRequest = {
  id: 10,
  status: 'pending',
  created_at: '2026-03-15T08:00:00.000Z',
  reason: 'Closer to school',
  tenant: {
    first_name: 'Jane',
    last_name: 'Doe',
  },
  current_room: {
    room_number: 'A-101',
    property_id: 99,
  },
  requested_room: {
    room_number: 'B-202',
    property: {
      id: 99,
    },
    billing_policy: 'monthly',
    min_stay_days: 0,
  },
  new_end_date: '2026-06-30',
};

const setupBaseApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/landlord/transfers') {
      return Promise.resolve({ data: { data: [pendingRequest] } });
    }

    if (url === '/landlord/transfers/10/proration') {
      return Promise.resolve({
        data: {
          data: {
            remaining_days: 12,
            old_room_unused_value: 1200,
            paid_amount: 5000,
            penalty: 0,
            credit_available: 800,
            new_room_cost: 925,
            suggested_adjustment: 150,
            quoted_transfer_fee: 300,
          },
        },
      });
    }

    return Promise.resolve({ data: {} });
  });
};

describe('Landlord TransferRequests screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = '';
    setupBaseApiMocks();
    api.patch.mockResolvedValue({ data: { success: true } });
  });

  it('blocks reject action when rejection reason is empty', async () => {
    render(<TransferRequests />);

    await screen.findByText('Transfer Request Details');

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(showError).toHaveBeenCalledWith('Please provide a reason before rejecting this request.');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects transfer when rejection reason is provided', async () => {
    render(<TransferRequests />);

    await screen.findByText('Transfer Request Details');

    fireEvent.change(
      screen.getByPlaceholderText('Add notes (required when rejecting)'),
      { target: { value: 'Requested room no longer available' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/landlord/transfers/10/handle',
        expect.objectContaining({
          action: 'reject',
          landlord_notes: 'Requested room no longer available',
        }),
      );
    });

    expect(showSuccess).toHaveBeenCalledWith('Transfer request rejectd successfully');
    await screen.findByText('Request already rejected');
  });

  it('approves transfer with proration payload and notes', async () => {
    render(<TransferRequests />);

    await screen.findByText('Transfer Request Details');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/landlord/transfers/10/proration');
    });

    fireEvent.change(
      screen.getByDisplayValue('300'),
      { target: { value: '275' } },
    );

    fireEvent.change(
      screen.getByPlaceholderText('Leave empty to use credit only'),
      { target: { value: '125' } },
    );

    fireEvent.change(
      screen.getByPlaceholderText('Landlord notes / instructions...'),
      { target: { value: 'Approved after room review' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Approval' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/landlord/transfers/10/handle',
        expect.objectContaining({
          action: 'approve',
          landlord_notes: 'Approved after room review',
          transfer_fee: 275,
          prorated_adjustment: 125,
        }),
      );
    });

    expect(showSuccess).toHaveBeenCalledWith('Transfer request approved successfully');

    await screen.findByText('Request already approved');
  });

  it('blocks approval when damage charge has no description', async () => {
    render(<TransferRequests />);

    await screen.findByText('Transfer Request Details');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/landlord/transfers/10/proration');
    });

    fireEvent.change(
      screen.getByPlaceholderText('Damage charge (optional)'),
      { target: { value: '200' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Approval' }));

    expect(showError).toHaveBeenCalledWith('Damage description is required when damage charge is set.');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows toast when proration fetch fails during approval start', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/landlord/transfers') {
        return Promise.resolve({ data: { data: [pendingRequest] } });
      }

      if (url === '/landlord/transfers/10/proration') {
        return Promise.reject(new Error('Proration unavailable'));
      }

      return Promise.resolve({ data: {} });
    });

    render(<TransferRequests />);

    await screen.findByText('Transfer Request Details');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Failed to calculate rent proration details');
    });

    expect(api.patch).not.toHaveBeenCalled();
  });
});
